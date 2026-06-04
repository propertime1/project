@echo off
title 一心智考后端服务器
color 0A

echo ==========================================
echo   一心智考考试系统 - 后端服务器启动
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请先安装 Node.js：https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装

echo.
echo [2/3] 检查依赖...
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo ✅ 依赖已安装
)

echo.
echo [3/3] 启动服务器...
echo.
echo ==========================================
echo   服务器地址：http://localhost:3001
echo   按 Ctrl+C 停止服务器
echo ==========================================
echo.

npm start

pause
