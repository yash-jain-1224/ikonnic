import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List user addresses' })
  async getAddresses(@Req() req: any) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  async addAddress(@Req() req: any, @Body() body: CreateAddressDto) {
    return this.usersService.addAddress(req.user.id, body);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  async updateAddress(@Param('id') id: string, @Req() req: any, @Body() body: UpdateAddressDto) {
    return this.usersService.updateAddress(id, req.user.id, body);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deleteAddress(id, req.user.id);
  }
}
