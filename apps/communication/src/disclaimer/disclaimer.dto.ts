import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum DISCLAIMER_TYPE {
    TERMS = 'terms',
    PRIVACY = 'privacy',
    TRANSPORT = "transport"
}
export class CreateDisclaimerDto {
    @ApiProperty({
        title: 'Disclaimer Type',
        enum: DISCLAIMER_TYPE,
    })
    @IsNotEmpty()
    @IsEnum(DISCLAIMER_TYPE)
    type: DISCLAIMER_TYPE;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    content: string;
}

export class GetDisclaimerByTypeDto {
    @ApiProperty({
        title: 'Disclaimer Type',
        enum: DISCLAIMER_TYPE,
    })
    @IsNotEmpty()
    @IsEnum(DISCLAIMER_TYPE)
    type: DISCLAIMER_TYPE;
}