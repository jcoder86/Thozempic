FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY icon.png /usr/share/nginx/html/icon.png
COPY hamburger.png /usr/share/nginx/html/hamburger.png
COPY pizza.png /usr/share/nginx/html/pizza.png
COPY kroeg.png /usr/share/nginx/html/kroeg.png
COPY thomas-torso.png /usr/share/nginx/html/thomas-torso.png
COPY thomas-torso-midden.png /usr/share/nginx/html/thomas-torso-midden.png
COPY thomas-torso-dik.png /usr/share/nginx/html/thomas-torso-dik.png
COPY thomas-torso-shoot.png /usr/share/nginx/html/thomas-torso-shoot.png
COPY thomas-arm-l.png /usr/share/nginx/html/thomas-arm-l.png
COPY thomas-arm-r.png /usr/share/nginx/html/thomas-arm-r.png
COPY thomas-arm-shoot.png /usr/share/nginx/html/thomas-arm-shoot.png
COPY thomas-leg-l.png /usr/share/nginx/html/thomas-leg-l.png
COPY thomas-leg-r.png /usr/share/nginx/html/thomas-leg-r.png
COPY lvl-eindhoven.png /usr/share/nginx/html/lvl-eindhoven.png
COPY lvl-amsterdam.png /usr/share/nginx/html/lvl-amsterdam.png
COPY lvl-dublin.png /usr/share/nginx/html/lvl-dublin.png
COPY lvl-denhaag.png /usr/share/nginx/html/lvl-denhaag.png
COPY lvl-basicfit.png /usr/share/nginx/html/lvl-basicfit.png
COPY lvl-hell.png /usr/share/nginx/html/lvl-hell.png
EXPOSE 80
