import { IsArray, IsISO8601, IsString, IsUrl, IsUUID } from 'class-validator';

export class SyncFaceDataDto {
    @IsUUID()
    employeeId!: string;

    @IsArray()
    listFaceEmbedding!: number[][];

    @IsString()
    @IsUrl({ require_tld: false })
    imageUrl!: string;

    @IsISO8601()
    updatedTime!: string;
}
