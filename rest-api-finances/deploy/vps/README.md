# Deploy da VPS

Este diretorio contem os artefatos versionados que o workflow de deploy envia para a VPS.

## Estrutura esperada na VPS

Exemplo de diretorio remoto:

```text
/opt/finances/
|-- docker-compose.prod.yml
|-- .env
|-- .deploy.env
```

## Bootstrap inicial

1. Criar o diretorio remoto configurado em `VPS_DEPLOY_PATH`.
2. Copiar `docker-compose.prod.yml` para esse diretorio.
3. Criar o arquivo `.env` na VPS com base em `.env.production.example`.
4. Instalar Docker Engine com Docker Compose plugin.
5. Garantir que a porta `8080` esteja liberada no host e que o frontend na Vercel aponte para a URL publica da API.

## Secrets esperados no GitHub

- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `VPS_HOST`
- `VPS_USERNAME`
- `VPS_PORT`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_DEPLOY_PATH`

## Fluxo do workflow

- publica a imagem do backend no GHCR com tag do commit SHA
- envia `docker-compose.prod.yml` para a VPS
- atualiza `.deploy.env` com a imagem e a tag publicada
- executa `docker compose pull` e `docker compose up -d`
- aguarda o healthcheck da aplicacao
