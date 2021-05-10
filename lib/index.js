"use strict";

// Module dependencies
const admin = require("firebase-admin");
const createUuid = require('uuid-v4');
// Public Dependencies
const { join, normalize } = require("path");

const winStrJoin = function (...paths) {
  return encodeURIComponent(
    normalize(join(...paths))
      .replace(/\\/g, "/")
      .replace(/^\//g, "")
  );
};
// build the downloadURL using the file infomation; adds the download token if it doesn't exists
async function getDownloadURL (fileRef) {
  const bucket = fileRef.bucket.name;
  const [metadata] = await fileRef.getMetadata();
  let downloadToken;

  if (!metadata.metadata) {
      console.log("NO");
      downloadToken = await setFirebaseMetadata(fileRef);
  } else {
      console.log("YES");
      downloadToken = metadata.metadata.firebaseStorageDownloadTokens.split(',')[0];
  }

  let url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fileRef.name)}?alt=media&token=${downloadToken}&`;

  return url;
} // getDownloadURL

// set the Firebase metadata with the downloadToken
async function setFirebaseMetadata (fileRef) {
  let downloadToken = createUuid();
  const metadata = {
      metadata: {
          firebaseStorageDownloadTokens: downloadToken
      }
  };

  let [response] = await fileRef.setMetadata(metadata);

  return downloadToken;

}

module.exports = {
  init(config) {
    admin.initializeApp({
      credential: admin.credential.cert(config.serviceAccount),
      storageBucket: config.bucket,
    });
    const storage = admin.storage()
    const bucket = storage.bucket();
    const folder = config.folder || "";

    return {
      upload(file) {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : "";
          const filename = `${path}${file.hash}${file.ext}`;
          const buff = Buffer.from(file.buffer, "binary");
          const remoteFile = bucket.file(winStrJoin(folder, filename));
          console.log(winStrJoin(folder, filename));
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

              file.url = `https://firebasestorage.googleapis.com/v0/b/${
                config.bucket
              }/o/${winStrJoin(folder, filename)}?alt=media`;
              bucket.getFiles()
              .then(([files]) => {
                  files.forEach(async file => {
                      let url = await getDownloadURL(file);
                      console.log(url);
                  });
                  resolve();
              })
              .catch(err => {
                  console.error(err);
              });
             
            }
          );
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : "";
          const filename = `${path}${file.hash}${file.ext}`;
          const remoteFile = bucket.file(winStrJoin(folder, filename));
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
