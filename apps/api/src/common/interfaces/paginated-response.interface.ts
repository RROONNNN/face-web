import { PaginationMetaDto } from '../dto/pagination-meta.dto';

export interface PaginatedResponse<T> {
    items: T[];
    meta: PaginationMetaDto;
}