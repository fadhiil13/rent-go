import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  uploadImage(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'rentgo/vehicles' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(new BadRequestException('Gagal upload gambar'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      // Pakai Readable bawaan Node — tidak perlu streamifier
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}