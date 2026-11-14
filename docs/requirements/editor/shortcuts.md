# Editor: shortcuts

## TL;DR

The starting list of keyboard and mouse shortcuts, and the keys the editor must never use because the browser owns them. Each shortcut ships with the feature it belongs to, so its version is that feature's version. On a Mac, Ctrl is Cmd and Alt is Option. Shortcuts for the game during play (Tab, R) are in [test play](../play-and-save/test-play.md).

## Where a shortcut works

- **Everywhere:** even while typing.
- **Editor:** unless the keyboard is in a text field or the code editor.
- **Level view:** only with the mouse over the level view.

## Keyboard

| Keys | What it does | Works | Feature |
|---|---|---|---|
| 1 to 7 | Pick a tool: Select, Pencil, Bézier pen, Shape, Text, Joint, Trigger zone. Twice locks the tool | Editor | Tools, v1 (Select, Shape, Joint), v2 (the others) |
| Space (hold) | Pan | Editor | Pan and zoom, v1 |
| F | Zoom to the selection, or to the whole level with nothing selected | Editor | Pan and zoom, v1 |
| + or Ctrl+=, - or Ctrl+- | Zoom in, zoom out | Editor | Pan and zoom, v1 |
| Shift+0 | Zoom to 100% | Editor | Pan and zoom, v1 |
| Shift+3 | Zoom to the camera frame | Editor | Pan and zoom, v1 |
| Ctrl+Z | Undo | Editor | Undo, v1 |
| Ctrl+Shift+Z, Ctrl+Y | Redo | Editor | Undo, v1 |
| Ctrl+C, Ctrl+X, Ctrl+V | Copy, cut, paste. In a text field they act on the text | Editor | Copy and paste, v1 |
| Ctrl+D | Duplicate | Everywhere except the code editor | Copy and paste, v1 |
| Del, Backspace | Delete the selection | Editor | Copy and paste, v1 |
| Ctrl+A | Select all | Editor | Selecting, v1 |
| Esc | See "What Esc does" in [workspace.md](workspace.md) | Everywhere | v1 |
| Arrows | Move the selection 1 px | Editor | Handles, v1 |
| Shift+arrows | Move the selection 10 px | Editor | Handles, v1 |
| Ctrl+Shift+arrows | Move the selection one grid step | Editor | Handles, v1 |
| Ctrl+G, Ctrl+Shift+G | Group, ungroup | Editor | Groups, v1 |
| Enter | Go into the selected group | Editor | Groups, v1 |
| F2 | Rename the selected entity | Editor | Layers panel, v1 |
| G | Show or hide the grid | Editor | Grid, v1 |
| Shift+G | Grid snapping on or off | Editor | Grid, v1 |
| Shift+P | Physics view on or off | Editor | Physics view, v1 |
| Ctrl+S | Export the project file | Everywhere | Saving, v1 |
| Ctrl+O | Import a project file | Editor | Saving, v1 |
| Ctrl+Enter | Play, or Stop while playing. In a field it commits the field first | Everywhere | Test play, v1 |
| F8 | Pause or resume test play | Everywhere | Pause and Step, v1 |
| F9 | Step one tick while paused | Everywhere | Pause and Step, v1 |
| ? | The shortcut list | Editor | Shortcut list, v2 |
| Ctrl+J | Open or close the Console | Everywhere | Console, v2 |
| Shift+S | Snapping to entities on or off | Editor | Snapping to entities, v3 |
| Ctrl+Alt+C, Ctrl+Alt+V | Copy and paste the component card under the mouse | Editor | Copy values, v3 |
| Ctrl+I | Invert the selection | Editor | Invert selection, v3 |
| Ctrl+Shift+L | Lock or unlock the selection | Editor | Lock, v3 |
| Ctrl+Shift+H | Hide or show the selection | Editor | Hide, v1 |
| Page Up, Page Down | Bring forward, send backward | Editor | Draw order commands, unscoped |
| Home, End | Bring to front, send to back | Editor | Draw order commands, unscoped |
| Ctrl+Shift+V | Paste at the original position | Editor | Paste in place, unscoped |
| Tab, Shift+Tab | Select the next or previous entity in the same group | Level view | Unscoped |

## Mouse

| Mouse | What it does | Feature |
|---|---|---|
| Wheel | Zoom at the mouse | Pan and zoom, v1 |
| Shift+wheel | Pan sideways | Pan and zoom, v1 |
| Middle drag, or Space+drag | Pan | Pan and zoom, v1 |
| Shift+click | Add to the selection | Selecting, v1 |
| Shift while dragging | Lock a move to one axis, keep proportions, or snap a rotation to 15° | Handles, v1 |
| Alt while resizing or drawing | Resize or draw from the centre | Handles, v1 |
| Ctrl while dragging | Turn snapping off | Grid, v1 |
| Double-click | Go into a group, edit points. Edit text from v2 | v1 |
| Alt+click | Select the next entity underneath | Next underneath, v3 |
| Alt+drag an entity | Drag out a copy | Unscoped |
| Right-click | Context menu | Unscoped |

## Keys the editor never uses

| Keys | Why |
|---|---|
| Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+Page Up, Ctrl+Page Down, Ctrl+F4 | The browser doesn't deliver them to pages. New level is therefore menu-only |
| Ctrl+Shift+T, Ctrl+Shift+N, Ctrl+Shift+W | The same family of tab and window commands |
| Ctrl+1 to 9, Alt+Left, Alt+Right, Alt+D, Ctrl+L | Tab and address bar habits people rely on |
| Ctrl+R, F5, F11, F12, Ctrl+Shift+I, Ctrl+U | Reload, full screen and developer tools stay available. Reload is safe because the level saves itself |
| Ctrl+0 | Left to the browser, as the way back from accidental browser zoom |
| Ctrl+Alt+anything else | Windows reports AltGr as Ctrl+Alt on many keyboard layouts, so these would fire while typing symbols. Ctrl+Alt+C and Ctrl+Alt+V are the one exception, and are refused when the browser reports AltGr |
| F6, F7, F10 | Browser focus keys |

Alignment has buttons and menu entries but no shortcuts, because Alt+letter collides with browser menus.

Source: round 1: D13; round 3: 01 2.5; round 4: 02 2.7; round 5: TK2, 02 2.5; round 6: CP1; round 12: SV1; old: WS-41, WS-45, section 2.5 of 01
