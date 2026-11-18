import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isRecord } from './RateLimitTracker.ts';

export const PUBLIC_REPO = 'im-nassinger/engine-v3-ci';

// Listed, not excluded: a new top-level file or folder stays private until it is added here.
// Never docs/, CLAUDE.md, .claude/, tools/runner/, tools/check-docs.js or tools/check-sources.js.
const PUBLIC_PATHS = [
    'src',
    'tests',
    'index.html',
    'package.json',
    'package-lock.json',
    '.npmrc',
    '.node-version',
    '.gitignore',
    '.prettierrc.json',
    '.prettierignore',
    '.dependency-cruiser.json',
    'eslint.config.ts',
    'playwright.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.node.json',
    'tools/package.json',
    '.github/workflows/ci.yml',
];

// Text that would tell the public who owns the laptop or where its files are.
const FORBIDDEN_TEXTS = ['ixcsoft', '/home/', 'ecs-game-v2'];

export type PublishResult =
    | { kind: 'published'; publicCommit: string }
    | { kind: 'refused'; files: string[] }
    | { kind: 'failed'; reason: string };

type LastPublish = {
    sourceCommit: string;
    publicCommit: string;
};

// Publishes a commit's public files to PUBLIC_REPO as one commit with no parent, so CI runs
// there for free. See docs/runner/public-ci.md.
export class PublicCopy {
    private readonly projectFolder: string;
    private readonly copyFolder: string;
    private readonly lastPublishFile: string;

    constructor(projectFolder: string, stateFolder: string) {
        this.projectFolder = projectFolder;
        this.copyFolder = path.join(stateFolder, 'public-copy');
        this.lastPublishFile = path.join(stateFolder, 'public-copy.json');
    }

    // Never throws: a git error is a failed result.
    publish(sourceCommit: string): PublishResult {
        const lastPublish = this.readLastPublish();
        if (lastPublish?.sourceCommit === sourceCommit) {
            return { kind: 'published', publicCommit: lastPublish.publicCommit };
        }

        try {
            return this.buildAndPush(sourceCommit);
        } catch (error) {
            const reason = error instanceof Error ? error.message.slice(-600) : String(error);
            return { kind: 'failed', reason };
        }
    }

    private buildAndPush(sourceCommit: string): PublishResult {
        this.extractPublicFiles(sourceCommit);

        const forbiddenFiles = this.findForbiddenFiles();
        if (forbiddenFiles.length > 0) return { kind: 'refused', files: forbiddenFiles };

        this.copyGit('init', '--quiet', '--initial-branch=master');
        this.copyGit('add', '--all');
        this.copyGit('commit', '--quiet', '--message', sourceCommit);
        this.copyGit('push', '--quiet', '--force', `https://github.com/${PUBLIC_REPO}.git`, 'master');

        const publicCommit = this.copyGit('rev-parse', 'HEAD');
        this.writeLastPublish({ sourceCommit, publicCommit });

        return { kind: 'published', publicCommit };
    }

    private extractPublicFiles(sourceCommit: string) {
        fs.rmSync(this.copyFolder, { recursive: true, force: true });
        fs.mkdirSync(this.copyFolder, { recursive: true });

        const archive = execFileSync('git', ['archive', '--format=tar', sourceCommit, '--', ...PUBLIC_PATHS], {
            cwd: this.projectFolder,
            maxBuffer: 1024 * 1024 * 1024,
        });
        execFileSync('tar', ['-x', '-C', this.copyFolder], { input: archive });
    }

    // Returns the copy's files, relative to it, that hold a forbidden text.
    private findForbiddenFiles() {
        const forbiddenFiles: string[] = [];
        const filePaths = fs.readdirSync(this.copyFolder, { recursive: true, encoding: 'utf8' });

        for (const relativePath of filePaths) {
            const fullPath = path.join(this.copyFolder, relativePath);
            if (!fs.statSync(fullPath).isFile()) continue;

            // latin1 maps each byte to one character, so binary files are searched too.
            const contents = fs.readFileSync(fullPath, 'latin1');
            const hasForbiddenText = FORBIDDEN_TEXTS.some((text) => contents.includes(text));
            if (hasForbiddenText) {
                forbiddenFiles.push(relativePath);
            }
        }

        return forbiddenFiles;
    }

    private readLastPublish() {
        if (!fs.existsSync(this.lastPublishFile)) return undefined;

        const text = fs.readFileSync(this.lastPublishFile, 'utf8');
        const parsed: unknown = JSON.parse(text);
        if (!isRecord(parsed)) return undefined;

        const lastPublish: LastPublish = {
            sourceCommit: String(parsed.sourceCommit),
            publicCommit: String(parsed.publicCommit),
        };

        return lastPublish;
    }

    private writeLastPublish(lastPublish: LastPublish) {
        const text = JSON.stringify(lastPublish);
        fs.writeFileSync(this.lastPublishFile, text);
    }

    private copyGit(...args: string[]) {
        const output = execFileSync('git', args, { cwd: this.copyFolder, encoding: 'utf8' });

        return output.trim();
    }
}
