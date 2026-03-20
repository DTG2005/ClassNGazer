# ClassNGazer

This is a WIP repository of the ClassNGazer app which allows the Faculties to:-

- **Create and Manage polls for the class on the go or in advance**
- **Allow belated access to the Poll responses**
- **Support LateX rendering on the Poll Options for Mathematical Accuracy**

## Installation/Code Review

#### Cloning

Clone the repository using
```sh
git clone https://github.com/DTG2005/ClassNGazer
```

or Download the ZIP file over HTTP using the green button followed by unzipping the file in your required directory.

### Dependencies required

#### Node

The Project requires Node version v22.21.1 and npm v10.9.4

For installation, [visit this site](https://nodejs.org/en/download) and follow the instructions for your respective OS.

#### Environment

The Environment Variables required to run the program correctly will be made available through email. The variables in the form of a `.env` file must be placed in the root directory of the project, making the directory structure look something like this:-

```
divyammaru@pop-os:~/Desktop/Divyams_Computer_Folder/CPP_Files/SoftEngProj/class-n-gazer$ tree -L 1 -la
.
├── app
├── .env.local
├── eslint.config.mjs
├── .git
├── .gitignore
├── .next
├── next.config.ts
├── next-env.d.ts
├── node_modules
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── public
├── README.md
├── todo.md
└── tsconfig.json

5 directories, 11 files
```

#### Other Dependencies

Open up the terminal in the directory of the repository. By default, the path should look like:-

```sh
/path/to/parent/folder/ClassNGazer/
```

Execute this command:
```sh
npm i
```

This should install all the additional dependencies required for running the application on your device.

## Running the App Server

Open up a terminal in the directory of the repository. Run the following command:-

```sh
npm run dev
```

This should start the webserver on the address http://localhost:3000. A Network address should also be visible to you which ideally should be visible to anyone connected to your network.