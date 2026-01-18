export type UserRole = 'DRIVER' | 'PASSENGER';

export interface UserProfile {
    uid: string;
    phoneNumber: string;
    displayName?: string;
    role: UserRole;
    currentServiceId?: string; // ID of the service currently active/joined
}

export interface ServiceRoute {
    _id: string;
    id?: string; // Virtual field from MongoDB
    name: string;
    plate: string;
    driver: UserProfile | string;
    code: string;
    schedules?: string[];
    active?: boolean;
    passengers?: UserProfile[] | string[];
    createdAt?: Date;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    timestamp: number;
}
