"use strict";

// Module dependencies
const admin = require("firebase-admin");

// Public Dependencies
const path = require("path");

module.exports = {
  init(config) {
    admin.initializeApp({
      credential: admin.credential.cert(config.serviceAccount),
      storageBucket: config.bucket,
    });

    const bucket = admin.storage().bucket();
    const folder = config.folder || "";

    return {
      upload(file) {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : "";
          const filename = `${path}${file.hash}${file.ext}`;
          const buff = Buffer.from(file.buffer, "binary");
          const remoteFile = bucket.file(path.join(folder, filename));
          remoteFile.save(
            buff,
            {
              resumable: false,
              contentType: file.mime,
              public: true,
            },
            (err) => {
              if (err) {
                console.log(err);
                reject(err);
              }

              file.url = `https://storage.googleapis.com/${path.join(
                config.bucket,
                folder,
                filename
              )}`;
              resolve();
            }
          );
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : "";
          const filename = `${path}${file.hash}${file.ext}`;
          const remoteFile = bucket.file(path.join(folder, filename));
          remoteFile.delete((err, _) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      },
    };
  },
};
