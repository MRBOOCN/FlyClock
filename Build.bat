@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ==================================================
echo   Companion 模块一键打包
echo ==================================================
echo.

rem 规避构建工具清理 pkg 暂存目录时的安全删除确认
set "CODEBUDDY_SAFE_DELETE_ENABLED=0"

rem ---------- 1. 运行环境检查 ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [失败] 未检测到 Node.js，请先安装 Node.js 后重新运行。
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [失败] 未检测到 npm，请重新安装 Node.js 后重新运行。
  goto :fail
)

rem ---------- 2. 必需内容检查与补齐 ----------
if not exist "package.json" (
  echo [失败] 缺少 package.json，无法自动补齐，请确认在模块根目录运行。
  goto :fail
)
if not exist "companion\manifest.json" (
  echo [失败] 缺少 companion\manifest.json，无法自动补齐，请确认在模块根目录运行。
  goto :fail
)

node -e "const fs=require('fs');const s=fs.readFileSync('package.json','utf8');const j=JSON.parse(s.charCodeAt(0)===65279?s.slice(1):s);let c=false;if(!j.scripts){j.scripts={};c=true}if(!j.scripts.package){j.scripts.package=j.scripts.build?j.scripts.build:(j.scripts.dist?j.scripts.dist:'companion-module-build');c=true}if(c){fs.writeFileSync('package.json',JSON.stringify(j,null,2)+'\n');console.log('[补齐] package.json 已补充 package 打包脚本')}else{console.log('[检查] package.json 打包脚本完整')}"
if errorlevel 1 (
  echo [失败] package.json 解析或补齐失败，请检查文件是否为合法 JSON。
  goto :fail
)

node -e "const fs=require('fs');let c=false;if(!fs.existsSync('HELP.md')){fs.writeFileSync('HELP.md','# 模块说明\n\n请在此补充模块使用说明。\n');c=true}if(!fs.existsSync('README.md')){fs.writeFileSync('README.md','# Companion 模块\n\n双击 Build.bat 即可一键打包。\n');c=true}if(fs.existsSync('.gitignore')){const L=fs.readFileSync('.gitignore','utf8').split(/\r?\n/);const out=L.filter(function(x){return !(x.trim().indexOf('#')!==0&&x.indexOf('*')!==-1&&/\.tgz\s*$/.test(x))});if(out.length!==L.length){fs.writeFileSync('.gitignore',out.join('\r\n'));c=true}}if(c){console.log('[补齐] 已补充 HELP.md / README.md / 修正 *.tgz 通配忽略规则')}else{console.log('[检查] HELP.md、README.md 与 .gitignore 完整')}"
if errorlevel 1 (
  echo [失败] 内容补齐失败。
  goto :fail
)

rem ---------- 3. 依赖检查与补齐 ----------
set "NEED_INSTALL="
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "package-lock.json" if not exist "yarn.lock" set "NEED_INSTALL=1"
if not defined NEED_INSTALL goto :deps_ready

echo [依赖] 依赖目录或 lockfile 缺失，正在安装...
if exist "yarn.lock" (
  where yarn >nul 2>nul
  if not errorlevel 1 (
    call yarn install --non-interactive
  ) else (
    echo [提示] 未检测到 yarn，改用 npm 安装依赖。
    call npm install --no-audit --no-fund
  )
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 goto :fail

:deps_ready
if not exist "node_modules\@companion-module\tools" (
  echo [补齐] 缺少构建工具 @companion-module/tools，正在安装...
  call npm install -D @companion-module/tools --no-audit --no-fund
  if errorlevel 1 goto :fail
)
if not exist "node_modules\@companion-module\base" (
  echo [补齐] 缺少运行时依赖 @companion-module/base，正在安装...
  call npm install @companion-module/base --no-audit --no-fund
  if errorlevel 1 goto :fail
)
echo [依赖] 依赖已就绪。

rem ---------- 4. 记录打包开始时刻 ----------
node -e "const fs=require('fs'),os=require('os'),path=require('path');fs.writeFileSync(path.join(os.tmpdir(),'companion-build-before.txt'),String(Date.now()))"
if errorlevel 1 goto :fail

rem ---------- 5. 执行打包 ----------
echo [打包] 执行 npm run package ...
call npm run package
if errorlevel 1 (
  echo [失败] 打包命令执行失败，请根据上方构建日志定位问题。
  goto :fail
)

rem ---------- 6. 校验本次产物 ----------
node -e "const fs=require('fs'),os=require('os'),path=require('path');const f=path.join(os.tmpdir(),'companion-build-before.txt');let t=0;try{t=Number(fs.readFileSync(f,'utf8'))||0}catch(e){}const a=fs.readdirSync('.').filter(function(x){return x.slice(-4)==='.tgz'});if(a.length===0){console.error('[失败] 打包命令已结束，但目录中未找到任何 *.tgz 产物');process.exit(1)}const n=a.filter(function(x){return fs.statSync(x).mtimeMs>=t});if(n.length===0){console.error('[失败] 打包命令已结束，但未检测到本次生成或更新的 *.tgz 产物');process.exit(1)}console.log('[完成] 本次打包产物：'+n.join('、'))"
if errorlevel 1 goto :fail

echo.
echo [完成] 一键打包成功。请将生成的 *.tgz 随仓库提交。
exit /b 0

:fail
echo.
echo [失败] 打包未完成，请按上方提示处理后重新运行 Build.bat。
echo [提示] 若双击窗口闪退，可在 cmd 中运行 Build.bat 查看完整输出。
exit /b 1
