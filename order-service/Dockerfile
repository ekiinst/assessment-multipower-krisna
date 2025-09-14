FROM node:18

# set working directory
WORKDIR /app

# copy package files
COPY package*.json ./

# install deps
RUN npm install

# install nodemon globally for hot reload
RUN npm install -g nodemon

# copy everything (src folder etc.)
COPY . .

# expose port
EXPOSE 8080

# run with nodemon (reload on save)
CMD ["nodemon", "src/index.js"]
