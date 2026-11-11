# Repository instructions

- Keep third-party base models and textures intact.
- Put navigation, HUD, and cross-addon compatibility changes in the consuming add-on instead of Test Guns when possible.
- Firearm bugfixes and balancing requested by the user are permitted.

## Git / GitHub access (this Windows host)

- `origin` is SSH: `git@github.com:GallonHong/lotm-mc.git`. Push access is verified: `ssh -T git@github.com` answers `Hi GallonHong/lotm-mc!` (the key is a repo-scoped GitHub deploy key with write access).
- GitHub auth uses the dedicated key `~/.ssh/id_ed25519_github`; `~/.ssh/config` already has its `Host github.com` block (`IdentitiesOnly yes`). Never regenerate, replace, or overwrite it, and do not touch any other key in `~/.ssh` (`id_ed25519` belongs to Gitee).
- Repo-local `core.sshCommand` is set to `C:/Windows/System32/OpenSSH/ssh.exe`. Git's bundled msys ssh cannot start under the DSH Windows sandbox (`couldn't create signal pipe`), so keep git on native OpenSSH. Do not append ssh options to that setting: git then runs it through msys `sh.exe`, which fails the same way.
- `hostfile_replace_entries: mkstemp: Permission denied` / `update_known_hosts ... Permission denied` warnings on git and ssh calls are harmless (the sandbox cannot write `~/.ssh/known_hosts`). Ignore them; they do not affect fetch/push.
- `~/.ssh` is outside the workspace, so the confined agent cannot write there. Any key or ssh-config change needs one approved full-access command.
- Sandbox quirk: files created by `ssh-keygen` inside the workspace get a protected ACL (user has Modify but not Delete), so the confined agent cannot delete them or edit their permissions. If one must be removed, ask the user to delete it from Explorer.
