require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testUpload() {
  try {
    const filePath = path.join(__dirname, 'test-image.jpg'); // put a sample image in server folder
    const fileStream = fs.createReadStream(filePath);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `test/${Date.now()}-test-image.jpg`,
      Body: fileStream,
      ContentType: 'image/jpeg',
    };

    const command = new PutObjectCommand(params);
    const result = await s3.send(command);
    console.log('Upload successful:', result);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}

testUpload();