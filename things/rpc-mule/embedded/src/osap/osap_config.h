/*
osap_config.h

config options for an osap-embedded build

Jake Read at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the osap project.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

#ifndef OSAP_CONFIG_H_
#define OSAP_CONFIG_H_

// -------------------------------- Track Version - Num 

// i.e. 0.1.2 
// MAJOR: 0, 
// MID: 1,
// MINOR: 2

#define OSAP_VERSION_MAJOR 0 
#define OSAP_VERSION_MID 4
#define OSAP_VERSION_MINOR 6 

// -------------------------------- Stack / Build Sizes

#define OSAP_CONFIG_STACK_SIZE 6
#define OSAP_CONFIG_PACKET_MAX_SIZE 256

#define OSAP_CONFIG_MAX_PORTS 32
#define OSAP_CONFIG_MAX_LGATEWAYS 16
#define OSAP_CONFIG_MAX_BGATEWAYS 8

#define OSAP_CONFIG_ROUTE_MAX_LENGTH 64 

// -------------------------------- Error / Debug Build Options 

#define OSAP_CONFIG_INCLUDE_DEBUG_MSGS
#define OSAP_CONFIG_INCLUDE_ERROR_MSGS

// -------------------------------- Bus-Inclusion or-not, 

#define OSAP_CONFIG_INCLUDE_BUS_CODES

#ifdef OSAP_CONFIG_INCLUDE_BUS_CODES
// count of broadcast channels width,
#define OSAP_BUSCONFIG_MAX_BROADCAST_CHANNELS 32
#endif 

#endif
