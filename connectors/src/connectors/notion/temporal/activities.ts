import {
  getPagesEditedSince,
  getParsedPage,
} from "@connectors/connectors/notion/lib/notion_api";
import { Connector, sequelize_conn } from "@connectors/lib/models";
import { nango_client } from "@connectors/lib/nango_client";
import { upsertToDatasource } from "@connectors/lib/upsert";
import { DataSourceConfig } from "@connectors/types/data_source_config";

export async function notionGetPagesToSyncActivity(
  accessToken: string,
  lastSyncedAt: number | null
): Promise<string[]> {
  return getPagesEditedSince(accessToken, lastSyncedAt);
}

export async function notionUpsertPageActivity(
  accessToken: string,
  pageId: string,
  dataSourceConfig: DataSourceConfig
) {
  const parsedPage = await getParsedPage(accessToken, pageId);
  await upsertToDatasource(
    dataSourceConfig,
    `notion-${parsedPage.id}`,
    parsedPage.rendered,
    parsedPage.url
  );
}

export async function saveSuccessSyncActivity(
  dataSourceConfig: DataSourceConfig
) {
  const transaction = await sequelize_conn.transaction();

  try {
    const connector = await Connector.findOne({
      where: {
        type: "notion",
        workspaceId: dataSourceConfig.workspaceId,
        dataSourceName: dataSourceConfig.dataSourceName,
      },
    });

    if (!connector) {
      throw new Error("Could not find connector");
    }

    const now = new Date();

    await connector.update({
      lastSyncStatus: "succeeded",
      lastSyncFinishTime: now,
      lastSyncSuccessfulTime: now,
    });

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

export async function saveStartSyncActivity(
  dataSourceConfig: DataSourceConfig
) {
  const transaction = await sequelize_conn.transaction();

  try {
    const connector = await Connector.findOne({
      where: {
        type: "notion",
        workspaceId: dataSourceConfig.workspaceId,
        dataSourceName: dataSourceConfig.dataSourceName,
      },
    });

    if (!connector) {
      throw new Error("Could not find connector");
    }

    await connector.update({
      lastSyncStartTime: new Date(),
    });

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

export async function getNotionAccessTokenActivity(
  nangoConnectionId: string
): Promise<string> {
  const { NANGO_NOTION_CONNECTOR_ID } = process.env;

  if (!NANGO_NOTION_CONNECTOR_ID) {
    throw new Error("NANGO_NOTION_CONNECTOR_ID not set");
  }

  const notionAccessToken = (await nango_client().getToken(
    NANGO_NOTION_CONNECTOR_ID,
    nangoConnectionId
  )) as string;

  return notionAccessToken;
}