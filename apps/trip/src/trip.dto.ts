import { BadRequestException, HttpStatus } from "@nestjs/common"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { plainToInstance } from "class-transformer"
import { IsArray, IsBoolean, IsBooleanString, IsDate, isDateString, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, isString, IsString, validateSync } from "class-validator"
import { Refine } from "utils/decorators/refine.decorator"
import { ApiError } from "utils/errors/api-error"

export enum CARRY_TYPE {
    DOCUMENT = "document",
    PACKAGE = "package"
}


export enum TRIP_STATUS {
    DRAFT = "draft",
    PUBLISHED = "published",
    DELETED = "deleted",
    ARCHIVED = "archived",
    CANCELLED = "cancelled",
    COMPLETED = "completed"
}

export enum TRANSPORT_TYPE {
    FLIGHT = "Flight",
    CAR = "Car",
    TRAIN = "Train",
    BUS = "Bus",
    TRUCK = "Truck",
    BOAT = "Boat",
}

export class StopDetails {
    @ApiProperty({
        description: "Stop Address is required",
        example: "123 Main St",
    })
    @IsNotEmpty()
    @IsString()
    address: string

    @ApiProperty({
        description: "Stop Location is required",
        example: "[longitude, latitude]",
    })
    @IsNotEmpty()
    @IsArray()
    location: number[]
}


class PricingDetails {
    @ApiPropertyOptional({
        description: "Currency is required",
        example: "USD",
    })
    @IsOptional()
    @IsString()
    currency: string

    @ApiPropertyOptional({
        description: "Price per kg is required",
        example: "100",
    })
    @IsNumber()
    @IsOptional()
    price_per_kg: number

    @ApiPropertyOptional({
        description: "Price per document is required",
        example: "100",
    })
    @IsNumber()
    @IsOptional()
    price_per_document: number

}
class VehicleDetails {
    @ApiPropertyOptional({
        description: "Vehicle Type is required",
        example: "BMW",
    })
    @IsOptional()
    @IsString()
    type: string

    @ApiPropertyOptional({
        description: "Vehicle Number is required",
        example: "123456",
    })
    @IsOptional()
    @IsString()
    number: string

    @ApiPropertyOptional({
        description: "Vehicle Name is required",
        example: "Toyota",
    })
    @IsOptional()
    @IsString()
    name: string

}

class TripRules {
    @ApiPropertyOptional({
        description: "Title is required",
        example: "Trip Rule 1",
    })
    @IsOptional()
    @IsString()
    title: string

    @ApiPropertyOptional({
        description: "Content is required",
        example: "Trip Rule 1 Content",
    })
    @IsOptional()
    @IsString()
    content: string
}



export class CreateTripDto {


    @ApiProperty({
        description: "Departure Address is required",
        example: "123 Main St",
    })
    @IsNotEmpty()
    @IsString()
    departure_address: string


    @ApiProperty({
        description: "Departure Location is required",
        example: "[longitude, latitude]",
    })
    @IsNotEmpty()
    @IsArray()
    departure_location: number[]

    @ApiProperty({
        description: "Departure Date is required",
        example: "2022-01-01",
    })
    @IsDateString()
    @Refine({
        validator: (value: string) => {
            if (new Date(value) < new Date()) {
                return false
            }
            return true
        },
        message: "Departure Date must be in the future"
    })
    departure_date: Date

    @ApiProperty({
        description: "Return Address is optional",
        example: "456 Oak St",
    })
    @IsOptional()
    @IsString()
    return_address: string

    @ApiProperty({
        description: "Return Location is optional",
        example: "[longitude, latitude]",
    })
    @IsOptional()
    return_location: number[]

    @ApiProperty({
        description: "Return Date is optional",
        example: "2022-01-01",
    })
    @IsDateString()
    @Refine({
        validator: (value: string, context: any) => {
            if (new Date(value) < new Date(context.departure_date)) {
                return false
            }
            return true
        },
        message: 'Return Date must be greater than Departure Date'
    })
    @IsOptional()
    return_date: Date

    @ApiPropertyOptional({
        description: "Stop Details is required",
        example: `[
            {
                address: "123 Main St",
                location: [longitude, latitude],
                date: "2022-01-01"
            }
        ]`
    })
    @IsArray()
    @IsOptional()
    stops: StopDetails[]

    @ApiPropertyOptional({
        description: "Carry Type is required",
        example: "Document",
        enum: CARRY_TYPE
    })
    @IsOptional()
    @IsEnum(CARRY_TYPE)
    carry_type: CARRY_TYPE

    @ApiPropertyOptional({
        description: "Pricing Details is required",
        example: {
            "currency": "BDT",
            "price_per_kg": 333,
            "price_per_document": 444
        }
    })
    @IsOptional()
    pricing_details: PricingDetails

    @ApiPropertyOptional({
        description: "Transport Type is required",
        example: "Car",
        enum: TRANSPORT_TYPE
    })
    @IsOptional()
    @IsEnum(TRANSPORT_TYPE)
    transport_type: TRANSPORT_TYPE

    @ApiPropertyOptional({
        description: "Vehicle Details is required",
        example: {
            "type": "Car",
            "number": "123456",
            "name": "Toyota",
        }
    })
    @IsOptional()
    vehicle_details: VehicleDetails

    @ApiPropertyOptional({
        description: "Ticket Image is required",
        example: "ticket_image.jpg",
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    @IsString()
    ticket_image: string

    @ApiPropertyOptional({
        description: "Trip Rules is required",
        example: [
            {
                "title": "Trip Rule 1",
                "content": "Trip Rule 1 Content"
            }
        ]
    })
    @IsOptional()
    trip_rules: TripRules[]

    @ApiPropertyOptional({
        description: "Available Space is required",
        example: "100",
    })


    @IsNumber()
    available_space_kg: number

    @ApiPropertyOptional({
        description: "Trip Description is required",
        example: "Trip Description",
    })
    @IsOptional()
    @IsString()
    trip_description: string

    @ApiPropertyOptional({
        description: "What We Accept is required",
        example: "What We Accept",
    })
    @IsOptional()
    @IsString()
    what_we_accept: string

    @ApiPropertyOptional({
        description: "Status is required",
        example: "Pending",
    })
    @IsOptional()
    @IsEnum(TRIP_STATUS)
    status: TRIP_STATUS


}

export class TempTripDto {
    @ApiProperty({
        description: "Trip Data is required",
        example: `{
        "departure_address": "123 Main St",
        "departure_location": [123, 456],
        "departure_date": "2025-01-01T12:00:00.000Z",
        "return_address": "456 Oak St",
        "return_location": [789, 101],
        "return_date": "2025-01-05T12:00:00.000Z",
        "stops": [
            {
                "address": "123 Main St",
                "location": [123, 456],
                "date": "2025-01-01T12:00:00.000Z"
            }
        ],
        "carry_type": "Document",
        "pricing_details": {
            "currency": "BDT",
            "price_per_kg": 333,
            "price_per_document": 444
        },
        "transport_type": "Car",
        "vehicle_details": {
            "type": "Car",
            "number": "123456",
            "name": "Toyota"
        },
        "ticket_image": "ticket_image.jpg",
        "trip_rules": [
            {
                "title": "Trip Rule 1",
                "content": "Trip Rule 1 Content"
            }
        ],
        "trip_description": "Trip Description"
    }`,
    })
    @IsString()
    @Refine({
        validator: (value) => {
            const data = plainToInstance(CreateTripDto, JSON.parse(value))
            const errors = validateSync(data)
            if (errors.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, errors[0]?.constraints ? Object.values(errors[0].constraints)[0] : 'Invalid JSON')
            }

            return true;
        }
    })
    data: string

    @ApiPropertyOptional({
        description: "Ticket Image is required",
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    @IsString()
    ticket_image: string

}


export class SearchTripDto {
    @ApiPropertyOptional({
        description: "Search is optional",
        example: "search",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: "Latitude is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    lat?: number;

    @ApiPropertyOptional({
        description: "Longitude is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    lng?: number;

    @ApiPropertyOptional({
        description: "Return Latitude is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    returnLat?: number;

    @ApiPropertyOptional({
        description: "Return Longitude is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    returnLng?: number;

    @ApiPropertyOptional({
        description: "Radius in KM is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    radiusKm?: number;

    @ApiPropertyOptional({
        description: "Minimum Price is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    minPrice?: number;

    @ApiPropertyOptional({
        description: "Maximum Price is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    maxPrice?: number;

    @ApiPropertyOptional({
        description: "Minimum Weight is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    minWeight?: number;

    @ApiPropertyOptional({
        description: "Maximum Weight is optional",
        example: 123,
    })
    @IsOptional()
    @IsNumberString()
    maxWeight?: number;

    @ApiPropertyOptional({
        description: "Departure Date is optional",
        example: "2022-01-01",
    })
    @IsOptional()
    @IsDateString()
    departureDate?: string;

    @ApiPropertyOptional({
        description: "Direct Only is optional",
        example: true,
    })
    @IsOptional()
    @IsBooleanString()
    directOnly?: boolean;

    @ApiPropertyOptional({
        description: "Allow Stops is optional",
        example: true,
    })
    @IsOptional()
    @IsBooleanString()
    allowStops?: boolean;

    @ApiPropertyOptional({
        description: "Transport Type is optional",
        example: TRANSPORT_TYPE.CAR,
    })
    @IsOptional()
    @IsEnum(TRANSPORT_TYPE)
    transportType?: TRANSPORT_TYPE;

    @ApiPropertyOptional({
        description: "Page is optional",
        example: 1,
    })
    @IsOptional()
    @IsNumberString()
    page?: number;

    @ApiPropertyOptional({
        description: "Limit is optional",
        example: 10,
    })
    @IsOptional()
    @IsNumberString()
    limit?: number;

    @ApiProperty({
        description: "Session ID is required",
        example: "32fc62e2-4bc4-4577-a432-46c03bc65639",
    })
    @IsNotEmpty()
    @IsString()
    session_id: string;

    @ApiPropertyOptional({
        description: "Currency is optional",
        example: "BDT",
    })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({
        description: "Most Trips",
        example: true,
    })
    @IsOptional()
    @IsBooleanString()
    most_trips?: boolean;

    @ApiPropertyOptional({
        description: "Top Rated",
        example: true,
    })
    @IsOptional()
    @IsBooleanString()
    top_rated?: boolean;
}


export class EditTripDto {
    @ApiPropertyOptional({
        description: "Trip Data is required",
        example: `{
        "departure_address": "123 Main St",
        "departure_location": [123, 456],
        "departure_date": "2025-01-01T12:00:00.000Z",
        "return_address": "456 Oak St",
        "return_location": [789, 101],
        "return_date": "2025-01-05T12:00:00.000Z",
        "stops": [
            {
                "address": "123 Main St",
                "location": [123, 456],
                "date": "2025-01-01T12:00:00.000Z"
            }
        ],
        "carry_type": "Document",
        "pricing_details": {
            "currency": "BDT",
            "price_per_kg": 333,
            "price_per_document": 444
        },
        "transport_type": "Car",
        "vehicle_details": {
            "type": "Car",
            "number": "123456",
            "name": "Toyota"
        },
        "ticket_image": "ticket_image.jpg",
        "trip_rules": [
            {
                "title": "Trip Rule 1",
                "content": "Trip Rule 1 Content"
            }
        ],
        "trip_description": "Trip Description"
    }`,
    })
    @IsString()
    @Refine({
        validator: (value) => {
            const data = plainToInstance(CreateTripDto, JSON.parse(value))
            const errors = validateSync(data)
            if (errors.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, errors[0]?.constraints ? Object.values(errors[0].constraints)[0] : 'Invalid JSON')
            }

            return true;
        }
    })
    data: string

    @ApiPropertyOptional({
        description: "Ticket Image is required",
        type: 'string',
        format: 'binary',
    })
    @IsOptional()
    @IsString()
    ticket_image: string

}


export class CancelTripDto {
    @ApiProperty({
        description: "Cancel Reason is required",
        example: "Cancel Reason",
    })
    @IsNotEmpty()
    @IsString()
    cancel_reason: string
}


