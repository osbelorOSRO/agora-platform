import {
  Controller,
  Delete,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { secureMediaMulterOptions } from '../media/media-security';
import { UserProfileService } from './user-profile.service';

@Controller('user-profile')
@UseGuards(PanelJwtAuthGuard)
export class UserProfileController {
  constructor(private readonly service: UserProfileService) {}

  @Get('photo')
  async getPhoto(@Request() req: any) {
    const userId: number = req.userPayload.id;
    const photoUrl = await this.service.getPhotoUrl(userId);
    return { photoUrl };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', secureMediaMulterOptions))
  async uploadPhoto(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    const userId: number = req.userPayload.id;
    const photoUrl = await this.service.uploadPhoto(userId, file);
    return { photoUrl };
  }

  @Delete('photo')
  async removePhoto(@Request() req: any) {
    const userId: number = req.userPayload.id;
    await this.service.removePhoto(userId);
    return { ok: true };
  }
}
