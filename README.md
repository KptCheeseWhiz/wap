### Web Anime Player (or WAP)

#### Run the web server within a docker

1. Run `docker-compose up --build`
2. The server will be available on `http://localhost:5000`

#### Run the web server in a standalone mode

1. Run the `configure` command located at the root of the project
2. Run `npm run dev` in the `server/frontend` folder
3. In another console, run `npm run dev` in the `server/backend` folder
4. The server will be available on `http://localhost:5000`

#### Build the electron app

1. Run the `configure` command located at the root of the project
2. Run `npm run dist` in the `electron` folder
3. The electron build will be in the `electron/dist` folder
