# Nodo Gem Smart Contracts

## NodeJS version

```
v16.17.0
```

## Install

```
git clone https://gitlab.moonstake.io/nodo/smartcontracts.git

cd smartcontracts

cp .env.example .env

npm install yarn -g

yarn
```

## Configuration

Copy file `.env.example` to `.env`

```
cp .env.example .env
```

Update deployer private key in .env

## Test

```
yarn test
```

## Deploy

### Deploy DEV

```
deploy:dev:celo
```
```
deploy:dev:avax
```
```
deploy:dev:base
```

### Deploy UAT

```
deploy:uat:celo
```

```
deploy:uat:avax
```

```
deploy:uat:base
```

### Deploy Production

```
deploy:prod:celo
```
```
deploy:prod:avax
```
```
deploy:prod:base
```
