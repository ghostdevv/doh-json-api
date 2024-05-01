FROM deno:alpine

WORKDIR /app

COPY . .

CMD ["deno", "task", "run"]
