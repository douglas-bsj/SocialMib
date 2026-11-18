@echo off
chcp 65001 >nul
title Mib Social - Subir atualizacao
cd /d "%~dp0"
echo ================================================
echo   Mib Social - enviando a atualizacao ao GitHub
echo ================================================
echo.

if not exist "*.patch" (
  echo [ERRO] Nenhum arquivo .patch encontrado nesta pasta.
  goto fim
)

echo [1/4] Indo para a versao principal (main)...
git checkout main || goto erro
git pull origin main || goto erro

echo.
echo [2/4] Aplicando as alteracoes...
for %%f in (*.patch) do (
  echo    - %%f
  git am "%%f"
  if errorlevel 1 (
    git am --abort >nul 2>&1
    echo [ERRO] Nao foi possivel aplicar %%f
    goto erro
  )
)

echo.
echo [3/4] Enviando para o GitHub...
git push origin main || goto erro

echo.
echo [4/4] Limpando...
del "*.patch" >nul 2>&1

echo.
echo ================================================
echo   PRONTO! Atualizacao enviada para o GitHub.
echo   Agora clique em "Pull and redeploy" no Portainer.
echo ================================================
goto fim

:erro
echo.
echo ------------------------------------------------
echo   Algo deu errado. Tire um print desta janela
echo   e mande para o Claude.
echo ------------------------------------------------

:fim
echo.
pause
