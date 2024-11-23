# Step 1: Use an official Node.js runtime as a parent image
FROM node:18

# Step 2: Set the working directory
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy the rest of your app's code
COPY . .

# Step 6: Expose the port your app is running on
EXPOSE 5001

# Step 7: Define environment variables (if needed)
ENV NODE_ENV=production

# Step 8: Run the app
CMD ["npm", "start"]
