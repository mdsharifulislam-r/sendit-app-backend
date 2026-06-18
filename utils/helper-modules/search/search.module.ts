import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';

@Module({
    imports: [
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                node: configService.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200',
            }), 
        }),
    ],
    exports: [SearchService],
    providers: [SearchService],
})
export class SearchModule { }