import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccountRole } from '../auth/account-role.enum';
import { AuthGuard } from '../auth/auth.guard';
import { AccountRoles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UploadFileQueryDto } from './dto/upload-file-query.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @AccountRoles([AccountRole.Admin, AccountRole.Employee])
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('File MIME type is required.'), false);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: UploadFileQueryDto,
  ) {
    return this.uploadsService.upload(file, query);
  }
}
