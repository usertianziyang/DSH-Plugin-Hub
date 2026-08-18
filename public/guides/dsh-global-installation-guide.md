# DeepSeek DSH 全局安装与使用指南

本文介绍如何在 Windows 和 macOS 上将 `@deepseek-ai/dsh` 安装为全局命令，从而可以直接使用 `dsh`，不必每次通过 `npx` 临时调用。

## 1. npx 与全局安装的区别

下面的命令会临时下载或调用 DSH：

~~~bash
npx @deepseek-ai/dsh web
~~~

它不一定会把 `dsh` 命令永久安装到系统中。

全局安装使用下面的命令：

~~~bash
npm install --global @deepseek-ai/dsh
~~~

该 npm 包暴露的全局可执行命令名是 `dsh`。安装后即可直接运行：

~~~bash
dsh web
~~~

## 2. 安装前检查

先确认本机已经安装 Node.js 和 npm：

~~~bash
node --version
npm --version
~~~

如果这两个命令都能输出版本号，就可以继续安装 DSH。

## 3. macOS 安装方式

### 3.1 全局安装

在 Terminal 中执行：

~~~bash
npm install --global @deepseek-ai/dsh
~~~

### 3.2 验证安装

~~~bash
dsh --help
which dsh
~~~

如果能看到帮助信息，并且 `which dsh` 能返回一个文件路径，说明安装成功。

### 3.3 使用 DSH

~~~bash
dsh web
~~~

### 3.4 如果出现权限错误

如果安装时出现 `EACCES` 或没有权限写入全局目录，推荐使用 nvm 管理 Node.js，或者将 npm 全局目录设置到当前用户目录。使用用户目录的方式如下：

~~~bash
mkdir -p ~/.npm-global
npm config set prefix "$HOME/.npm-global"
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
npm install --global @deepseek-ai/dsh
~~~

如果使用 Bash 而不是 zsh，请将 `~/.zshrc` 替换为 `~/.bashrc`。

### 3.5 如果提示找不到 dsh

查看 npm 全局安装目录：

~~~bash
npm prefix --global
~~~

Unix 系统的全局命令通常位于该目录下的 `bin` 文件夹。可以临时加入当前终端：

~~~bash
export PATH="$(npm prefix --global)/bin:$PATH"
~~~

如果确认有效，可以永久写入 zsh 配置：

~~~bash
echo 'export PATH="$(npm prefix --global)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
~~~

## 4. Windows 安装方式

### 4.1 全局安装

在 PowerShell 或命令提示符中执行：

~~~powershell
npm install --global @deepseek-ai/dsh
~~~

### 4.2 验证安装

~~~powershell
dsh --help
where.exe dsh
~~~

如果能看到帮助信息，并且 `where.exe dsh` 能返回一个文件路径，说明安装成功。

### 4.3 使用 DSH

~~~powershell
dsh web
~~~

### 4.4 如果提示找不到 dsh

查看 npm 全局目录：

~~~powershell
npm config get prefix
~~~

将命令输出的目录加入 Windows 用户环境变量 `Path`。常见目录可能是：

~~~text
C:\Users\你的用户名\AppData\Roaming\npm
~~~

不过不同 Node.js 安装方式的目录可能不同，应以 `npm config get prefix` 的实际输出为准。

添加环境变量后，关闭并重新打开 PowerShell，再运行：

~~~powershell
dsh --help
~~~

也可以只在当前 PowerShell 窗口临时加入该目录：

~~~powershell
$npmPrefix = npm config get prefix
$env:Path = "$npmPrefix;$env:Path"
~~~

## 5. 常用维护命令

### 更新 DSH

~~~bash
npm update --global @deepseek-ai/dsh
~~~

或者重新安装最新版：

~~~bash
npm install --global @deepseek-ai/dsh@latest
~~~

### 查看全局安装位置

macOS：

~~~bash
npm prefix --global
which dsh
~~~

Windows：

~~~powershell
npm config get prefix
where.exe dsh
~~~

### 卸载 DSH

~~~bash
npm uninstall --global @deepseek-ai/dsh
~~~

## 6. 常见问题排查

### dsh: command not found 或 Windows 找不到命令

通常是 npm 全局命令目录没有加入 `PATH`。检查以下内容：

macOS：

~~~bash
npm prefix --global
which dsh
echo "$PATH"
~~~

Windows：

~~~powershell
npm config get prefix
where.exe dsh
echo $env:Path
~~~

确认目录加入 `PATH` 后，必须重新打开终端窗口。

### npx 可以运行，但 dsh 不能运行

这说明 npm 包本身可用，但全局安装目录没有正确配置，或者当前终端还没有刷新环境变量。重新执行全局安装，并检查 `PATH`：

~~~bash
npm install --global @deepseek-ai/dsh
dsh --help
~~~

### 想继续使用临时调用

如果不希望全局安装，仍然可以使用：

~~~bash
npx @deepseek-ai/dsh web
~~~

## 7. 最简操作清单

macOS 和 Windows 都可以执行：

~~~bash
npm install --global @deepseek-ai/dsh
dsh --help
dsh web
~~~

如果 `dsh --help` 能正常显示帮助信息，说明全局配置已经完成。
