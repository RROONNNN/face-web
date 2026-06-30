import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';
import { UploadFileQueryDto } from './dto/upload-file-query.dto';

interface CloudinaryUploadResult extends UploadApiResponse {
  asset_id?: string;
  version_id?: string;
}

export interface UploadedFileResult {
  url: string;
  width?: number;
  height?: number;
}

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) { }

  async upload(
    file: Express.Multer.File | undefined,
    query: UploadFileQueryDto,
  ): Promise<UploadedFileResult> {
    if (!file?.buffer) {
      throw new BadRequestException('File is required.');
    }

    this.configureCloudinary();

    const defaultFolder =
      this.configService.get<string>('cloudinary.folder') ?? 'face-web';
    const resourceType = query.resourceType ?? 'auto';
    const folder = query.folder ?? defaultFolder;

    const result = await this.uploadBuffer(file.buffer, {
      folder,
      resource_type: resourceType,
      filename_override: file.originalname,
    });

    return this.toUploadedFileResult(result);
  }

  private configureCloudinary() {
    const cloudName = this.getCloudinaryConfig('cloudName');
    const apiKey = this.getCloudinaryConfig('apiKey');
    const apiSecret = this.getCloudinaryConfig('apiSecret');

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  private getCloudinaryConfig(key: 'cloudName' | 'apiKey' | 'apiSecret') {
    const value = this.configService.get<string>(`cloudinary.${key}`);
    if (!value) {
      throw new ServiceUnavailableException(
        `Cloudinary ${key} is not configured.`,
      );
    }
    return value;
  }

  private uploadBuffer(
    buffer: Buffer,
    options: {
      folder: string;
      resource_type: 'image' | 'video' | 'raw' | 'auto';
      filename_override: string;
    },
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(new BadGatewayException(error.message));
            return;
          }

          if (!result) {
            reject(new BadGatewayException('Cloudinary upload failed.'));
            return;
          }

          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private toUploadedFileResult(
    response: CloudinaryUploadResult,
  ): UploadedFileResult {
    return {
      width: response.width,
      height: response.height,
      url: response.url,
    };
  }
}
