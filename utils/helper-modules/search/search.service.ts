import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elastic: ElasticsearchService,
  ) {}

  // =============================
  // CREATE INDEX DOCUMENT
  // =============================
  async createIndex<T>(
    indexName: string,
    id: string,
    data: T,
  ) {
    try {
      if (!indexName || !id || !data) return;

      const newData: any = { ...data };

      if (newData._id) delete newData._id;

      const exists = await this.elastic.indices.exists({
        index: indexName.toLowerCase(),
      });

      if (!exists) {
        await this.elastic.indices.create({
          index: indexName.toLowerCase(),
        });
      }

      await this.elastic.index({
        index: indexName.toLowerCase(),
        id,
        document: newData,
      });

      await this.elastic.indices.refresh({
        index: indexName.toLowerCase(),
      });

      this.logger.log(`Indexed: ${indexName} -> ${id}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  // =============================
  // SEARCH
  // =============================
  async searchIndex(
    indexName: string,
    query: string,
    fields?: string[],
  ) {
    try {
      const response = await this.elastic.search({
        index: indexName.toLowerCase(),
        query: {
          multi_match: {
            query,
            fields: fields?.length ? fields : ['*'],
            fuzziness: 'AUTO',
          },
        },
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          require_field_match: false,
          fields: {
            '*': {},
          },
        },
      });

      return response.hits.hits;
    } catch (error) {
      this.logger.error(error);
    }
  }

  // =============================
  // UPDATE
  // =============================
  async updateIndex<T>(
    indexName: string,
    id: string,
    data: T,
  ) {
    try {
      if (!indexName || !id || !data) return;

      const newData: any = { ...data };

      if (newData._id) delete newData._id;

      await this.elastic.update({
        index: indexName.toLowerCase(),
        id,
        doc: newData,
        doc_as_upsert: true,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  // =============================
  // DELETE
  // =============================
  async deleteIndex(indexName: string, id: string) {
    try {
      if (!indexName || !id) return;

      await this.elastic.delete({
        index: indexName.toLowerCase(),
        id,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}