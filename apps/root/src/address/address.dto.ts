import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export enum ADDRESS_TYPE {
    PERSONAL = "personal",
    BUSINESS = "business"
}

export class CreateAddressDto {
    @ApiProperty({
        enum: ADDRESS_TYPE,
        description: 'Address type',
        example: ADDRESS_TYPE.PERSONAL,
    })
    @IsNotEmpty()
    @IsEnum(ADDRESS_TYPE)
    type: ADDRESS_TYPE


    @ApiProperty({
        example: '123 Main St',
        description: 'Address',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    address: string

    @ApiProperty({
        example: 123,
        description: 'Latitude',
        required: true,
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number

    @ApiProperty({
        example: 123,
        description: 'Longitude',
        required: true,
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number


}


export class UpdateAddressDto {
    @ApiPropertyOptional({
        enum: ADDRESS_TYPE,
        description: 'Address type',
        example: ADDRESS_TYPE.PERSONAL,
    })
    @IsOptional()
    @IsEnum(ADDRESS_TYPE)
    type: ADDRESS_TYPE

    @ApiPropertyOptional({
        example: '123 Main St',
        description: 'Address',
        required: false,
    })
    @IsOptional()
    @IsString()
    address: string

    @ApiPropertyOptional({
        example: 123,
        description: 'Latitude',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number

    @ApiPropertyOptional({
        example: 123,
        description: 'Longitude',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number

}