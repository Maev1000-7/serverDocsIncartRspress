FROM node:25-alpine AS build

WORKDIR /app



COPY . .



FROM nginx:stable-alpine AS production

RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/nginx.conf

COPY nginx.conf /etc/nginx/
COPY --from=build /app/doc_build /usr/share/nginx/html/

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
