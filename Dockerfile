# Base Node image
FROM node:18

# Install OpenJDK
RUN apt-get update && apt-get install -y openjdk-17-jdk

# Set JAVA_HOME (optional)
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# App directory
WORKDIR /usr/src/app

# Copy app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
