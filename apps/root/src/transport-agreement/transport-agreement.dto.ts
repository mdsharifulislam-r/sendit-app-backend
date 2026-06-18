import { IsEnum, IsOptional, IsString } from "class-validator";

export enum AGREEMENT_VALIDITY {
    VALID_FOR_ONE_TRIP = 'Valid for One Trip',
    VALID_FOR_6_MONTHS = 'Valid for 6 Months',
    VALID_FOR_1_YEAR = 'Valid for 1 Year',
}

export enum SIGNATURE_TYPE {
    TYPE = 'Type',
    DRAW = 'Draw'

}

export class CreateTransportAgreementDto {
    @IsEnum(AGREEMENT_VALIDITY)
    validity: AGREEMENT_VALIDITY

    @IsEnum(SIGNATURE_TYPE)
    signature_type: SIGNATURE_TYPE

    @IsOptional()
    @IsString()
    signature: string

    singnature_image: string


}