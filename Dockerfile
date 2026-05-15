FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY icon.png /usr/share/nginx/html/icon.png
COPY hamburger.png /usr/share/nginx/html/hamburger.png
COPY pizza.png /usr/share/nginx/html/pizza.png
COPY background.png /usr/share/nginx/html/background.png
EXPOSE 80
