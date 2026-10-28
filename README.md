# 3DPD Downloader

<img src="assets/icon.svg" width="80" alt="Логотип 3DPD Downloader">

Userscript для скачивания видео без аккаунта: выбор качества, размер файла и прогресс загрузки прямо в кнопке загрузки сайта. Работает на страницах `/video/…` с плеером KVS и меню загрузки, как у 3DPD.

## Установка

[![Установить 3DPD Downloader](assets/install.svg)](https://github.com/Laynholt/3dpd-downloader/releases/latest/download/3dpd-downloader.user.js)

### ПК — Violentmonkey

1. Установите [Violentmonkey](https://violentmonkey.github.io/get-it/).
2. Нажмите **«Установить 3DPD Downloader»** и подтвердите установку.
3. Обновите страницу с видео.

Если стоит старая версия скрипта с другим названием, удалите её в Violentmonkey, чтобы кнопки не дублировались.

### iPhone / iPad — Userscripts для Safari

1. Установите [Userscripts из App Store](https://apps.apple.com/app/userscripts/id1463298887) и включите расширение в Safari.
2. [Скачайте скрипт](https://github.com/Laynholt/3dpd-downloader/releases/latest/download/3dpd-downloader.user.js) и через «Файлы» сохраните его в папку скриптов Userscripts.
3. Обновите страницу с видео.

На iPhone Safari не даёт скрипту самому скачать файл, поэтому пункты меню становятся прямыми ссылками на видео нужного качества:

- **нажатие** открывает видео в новой вкладке Safari и копирует название видео. Сохраните файл, затем в «Файлах»: долгое нажатие на файл → «Переименовать» → «Вставить»;
- **долгое нажатие → «Скопировать ссылку»** — ссылку можно вставить в другой браузер или приложение-загрузчик. Ссылка действует ограниченное время, используйте её сразу.

### Android — Firefox и Violentmonkey

1. Установите [Firefox для Android](https://www.mozilla.org/firefox/browsers/mobile/android/).
2. В Firefox установите [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/).
3. В этом же браузере нажмите **«Установить 3DPD Downloader»** и подтвердите установку.

На реальном Android-устройстве скрипт пока не проверялся.

## Как пользоваться

Скрипт встраивается в кнопку загрузки под плеером и меняет её иконку на свою.

1. Нажмите кнопку загрузки — откроется список качеств с размерами файлов (4K, 1080p, 720p, 480p).
2. Нажмите на качество. В пункте списка видно, сколько скачано: `4K · 45% · 62.1 / 137.4 МБ`, на кнопке — процент.
3. Повторное нажатие отменяет загрузку. Когда файл скачан, он сохраняется сам.

Если загрузка не удалась, в пункте списка появится причина. Её удобно прислать в [сообщении об ошибке](https://github.com/Laynholt/3dpd-downloader/issues/new).

## Ограничения

- На ПК файл собирается в памяти браузера перед сохранением.
- Скрипт опирается на вёрстку сайта и может сломаться после его обновления.

## Ваши данные

Скрипт ничего не хранит и не отправляет сторонним сервисам. На страницах без нужного плеера он ничего не делает.

## Разработка

Весь код — в `3dpd-downloader.user.js`. Node.js нужен только для проверок, зависимостей нет.

```bash
node tests/check.cjs
```

```bash
node build.mjs --check
```

Выпуск новой версии:

1. Поднимите `@version` в `3dpd-downloader.user.js`, выполните `node build.mjs` (обновит `3dpd-downloader.meta.js`) и закоммитьте.
2. Создайте релиз с тегом `vX.Y.Z` и приложите оба файла:

```bash
gh release create vX.Y.Z 3dpd-downloader.user.js 3dpd-downloader.meta.js --title vX.Y.Z --generate-notes
```
