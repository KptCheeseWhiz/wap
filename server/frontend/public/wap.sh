#!/bin/bash

echo -n '' > ~/.local/share/applications/wap.desktop
echo '[Desktop Entry]' >> ~/.local/share/applications/wap.desktop
echo 'Type=Application' >> ~/.local/share/applications/wap.desktop
echo 'Name=VLC scheme handler' >> ~/.local/share/applications/wap.desktop
echo 'Exec=~/.local/share/wap.sh %u' >> ~/.local/share/applications/wap.desktop
echo 'StartupNofity=false' >> ~/.local/share/applications/wap.desktop
echo 'MimeType=x-scheme-handler/vlc;' >> ~/.local/share/applications/wap.desktop

echo -n '' > ~/.local/share/wap.sh
echo '#!/bin/bash' >> ~/.local/share/wap.sh
echo '' >> ~/.local/share/wap.sh
echo 'if [[ "$1" == "vlc:"* ]]; then' >> ~/.local/share/wap.sh
echo '  URL=${1#vlc://}' >> ~/.local/share/wap.sh
echo '  vlc "$URL"' >> ~/.local/share/wap.sh
echo 'else' >> ~/.local/share/wap.sh
echo '  xdg-open "$1"' >> ~/.local/share/wap.sh
echo 'fi' >> ~/.local/share/wap.sh
chmod +x ~/.local/share/wap.sh

xdg-mime default wap.desktop x-scheme-handler/vlc