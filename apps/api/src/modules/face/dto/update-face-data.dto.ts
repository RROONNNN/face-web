import { IsArray, IsString, IsUrl } from 'class-validator';

export class UpdateFaceDataDto {
    @IsArray()
    listFaceEmbedding!: number[][];

    @IsString()
    @IsUrl({ require_tld: false })
    imageUrl!: string;
}
