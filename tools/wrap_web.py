"""Run the same game packager used by Android and Pages CI."""

import os
from pathlib import Path
import shutil
import subprocess
import sys


def find_shell():
    if os.name != 'nt':
        return shutil.which('sh')
    git = shutil.which('git')
    if git:
        for directory in Path(git).resolve().parents:
            bash = directory / 'bin' / 'bash.exe'
            if bash.is_file():
                return str(bash)
    return None


def main():
    shell = find_shell()
    if not shell:
        sys.exit('Install Git for Windows and make git available on PATH to package TileTopia.')
    root = Path(__file__).resolve().parent.parent
    command = [shell, 'scripts/wrap-web.sh', *sys.argv[1:]]
    return subprocess.run(command, cwd=root).returncode


if __name__ == '__main__':
    sys.exit(main())
