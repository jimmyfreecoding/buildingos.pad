export interface Company {
  orgName: string
}

export interface Room {
  id: string | number
  name: string
  code?: string
}

export type MeetingRoom = Room
export type Area = Room
export type Toilet = Room

export interface Floor {
  id: string | number
  name: string
  code?: string
  mettingRoom?: MeetingRoom[]
  room?: Room[]
  area?: Area[]
  toilet?: Toilet[]
  pubarea?: Area[]
}

export interface FloorArea {
  id: string | number
  name: string
  code?: string
  floor: Floor[]
}

export interface Space {
  id: string | number
  name: string
  code?: string
  floorArea: FloorArea[]
  company?: Company[]
  mqttstring?: string
}
