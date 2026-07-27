import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBooleanString, IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";
import { Refine } from "utils/decorators/refine.decorator";
import { Period } from "utils/helper/dateHelper";

export enum PACKAGE_SIZE {
    SMALL = "Small",
    MEDIUM = "Medium",
    LARGE = "Large"
}


export enum PACKAGE_TYPE {
    FOOD = 'Food',
    CLOTHES = "Clothes",
    DOCUMENTS = "Documents",
    ELECTRONICS = "Electronics",
    MEDICINE = "Medicine",
    OTHER = "Other",
}


export enum BOOKING_STATUS {
    PENDING = "Pending",
    CONFIRMED = "Confirmed",
    CANCELLED = "Cancelled",
    REFUNDED = "Refunded",
    DELIVERED = "Delivered",
    REJECTED = 'Rejected'
}

export enum DELIVERY_SPEED {
    NORMAL = "Normal",
    URGENT = "Urgent",
    ASAP = "ASAP"
}

export enum BOOKING_PREFFERENCE {
    DROP_POINT = "Drop Point",
    RECIPIENTS_ADDRESS = "Recipient's Address",
    VIA_POST = 'Via Post',
}


export enum TIMELINE_TYPE {
    BOOKED = 'Booked',
    PICKED_UP = 'Picked Up',
    IN_TRANSIT = 'In Transit',
    DELIVERED = 'Delivered',
    CANCELLED = 'Cancelled',
}
export class CreateBookingDto {
    @ApiProperty({
        enum: PACKAGE_SIZE,
        description: "Give the ideal package size, this help to calculate the price",
        example: PACKAGE_SIZE.SMALL,
    })
    @IsNotEmpty()
    @IsEnum(PACKAGE_SIZE)
    package_size: PACKAGE_SIZE

    @ApiProperty({
        enum: PACKAGE_TYPE,
        description: "Give the actual package type, this help to calculate the price",
        example: PACKAGE_TYPE.FOOD,
    })
    @IsNotEmpty()
    @IsEnum(PACKAGE_TYPE)
    package_type: PACKAGE_TYPE

    @ApiProperty({
        description: "Give the pickup method",
        example: "Drop Point",
    })
    @IsNotEmpty()
    @IsString()
    pickup_method: string

    @ApiProperty({
        description: "Give the pickup date",
        example: "2022-01-01",
    })
    @IsNotEmpty()
    @IsDateString()
    @Refine({
        validator: (value) => {
            const date = new Date(value)
            const today = new Date()
            return date >= today
        },
        message: "Pickup date must be greater than or equal to today"
    })
    pickup_date: Date

    @ApiProperty({
        description: "Give the actual package weight in kg",
        example: 5,
    })
    @IsNotEmpty()
    @IsNumberString()
    weight: number

    @ApiProperty({
        description: "Give the actual package contents",
        example: "Clothes, Food, Electronics, Medicine, Other",
    })
    @IsNotEmpty()
    @IsString()
    package_content: string;

    @ApiProperty({
        description: "Give the actual package exterior images",
        type: "string",
        format: "binary"
    })
    exterior_images: string[]

    @ApiProperty({
        description: "Give the actual package interior images",
        type: 'string',
        format: 'binary'
    })
    interior_images: string[]

    @IsOptional()
    @IsBooleanString()
    need_to_storage_untill_pickup: boolean

    @ApiProperty({
        description: "Give the storage start date",
        example: "2022-01-01",
    })
    @IsOptional()
    @IsDateString()
    storage_start_date: Date

    @ApiProperty({
        description: "Give the storage end date",
        example: "2022-01-01",
    })
    @IsOptional()
    @IsDateString()
    storage_end_date: Date


    @ApiProperty({
        description: "Give the sender information",
        example: {
            name: "John Doe",
            phone: "1234567890",
        },
    })
    @IsNotEmpty()
    sender_information: {
        name: string,
        phone: string
    }

    @ApiProperty({
        description: "Give the receiver information",
        example: {
            name: "John Doe",
            phone: "1234567890",
        },
    })
    @IsNotEmpty()
    receiver_information: {
        name: string,
        phone: string
    }

    @ApiProperty({
        description: "Give the receiver id",
        example: "1",
    })
    @IsNotEmpty()
    @IsString()
    receiver_id: string

    @ApiProperty({
        description: "Give the pickup address",
        example: "123 Main St",
    })
    @IsNotEmpty()
    @IsString()
    pickup_address: string

    @ApiProperty({
        description: "Give the pickup location",
        example: {
            "latitude": 12.9716,
            "longitude": 77.5946
        },
    })
    @IsNotEmpty()
    pickup_location: { latitude: number, longitude: number }

    @ApiProperty({
        description: "Give the dropoff address",
        example: "123 Main St",
    })
    @IsNotEmpty()
    @IsString()
    dropoff_address: string

    @ApiProperty({
        description: "Give the dropoff location",
        example: {
            latitude: 12.9716,
            longitude: 77.5946
        },
    })
    @IsNotEmpty()
    dropoff_location: { latitude: number, longitude: number }

    @ApiProperty({
        description: "Give the delivery speed",
        example: DELIVERY_SPEED.NORMAL,
    })
    @IsNotEmpty()
    @IsEnum(DELIVERY_SPEED)
    delivery_speed: DELIVERY_SPEED

    @ApiProperty({
        description: "Give the booking preffernce",
        example: BOOKING_PREFFERENCE.DROP_POINT,
    })
    @IsEnum(BOOKING_PREFFERENCE)
    booking_preffernce: BOOKING_PREFFERENCE


    timeline: {
        date: Date,
        status: TIMELINE_TYPE,
    }[]

}











/// place booking order dto

export class PlaceBookingDto {
    @ApiProperty({
        description: "Give the session id",
        example: "1",
    })
    @IsNotEmpty()
    @IsString()
    session_id: string

    @ApiProperty({
        description: "Give the trip id",
        example: "1",
    })
    @IsNotEmpty()
    @IsString()
    trip_id: string

    @ApiProperty({
        description: "Give the coupon code",
        example: "COUPON123",
    })
    @IsOptional()
    @IsString()
    coupon_code: string
}





export class ChangeBookingStatusDto {
    @ApiProperty({
        description: "Give the status",
        example: BOOKING_STATUS.PENDING,
    })
    @IsNotEmpty()
    @IsEnum(BOOKING_STATUS)
    status: BOOKING_STATUS

    @ApiProperty({
        description: "Give the rejection reason",
        example: "Booking rejected",
    })
    @IsOptional()
    @IsString()
    rejection_reason: string
}



export class PickupConditionDto {
    proof_image: string

    @ApiProperty({
        description: "Give the package condition",
        example: "John Doe",
    })
    @IsNotEmpty()
    @IsString()
    package_condition: string

    damage_image: string

    @IsOptional()
    @IsString()
    note: string
}


export class DeliveryConfirmationDto extends PickupConditionDto {
    @ApiProperty({
        description: "Give the recipient name",
        example: "John Doe",
    })
    @IsNotEmpty()
    @IsString()
    recipient_name: string

    @ApiProperty({
        description: "Give the recipient signature",
        example: "John Doe",
    })

    @ApiProperty({
        description: "Give the recipient signature type",
        enum: ['text', 'image', 'signature'],
        example: "text",
    })
    @IsNotEmpty()
    @IsEnum(['text', 'image', 'signature'])
    recipient_signature_type: string


    @IsOptional()
    @IsString()
    recipient_signature: string
}


export class CancelBookingDto {
    @ApiProperty({
        description: "Give the cancellation reason",
        example: "Booking cancelled",
    })
    @IsNotEmpty()
    @IsString()
    cancellation_reason: string
}


export class LocationUpdateDto {
    @ApiProperty({
        description: "Give the user id",
        example: "1",
    })
    @IsNotEmpty()
    @IsString()
    user_id: string

    @ApiProperty({
        description: "Give the location",
        example: {
            latitude: 12.9716,
            longitude: 77.5946
        },
    })
    @IsNotEmpty()
    location: { latitude: number, longitude: number }
}


export class GetEarningsAndClientAmount {
    @ApiProperty({
        description: "Give the range",
        enum: ['weekly', 'monthly', 'daily'],
        example: "weekly",
    })
    @IsEnum(['weekly', 'monthly', 'daily'])
    range: 'weekly' | 'monthly' | 'daily'
}