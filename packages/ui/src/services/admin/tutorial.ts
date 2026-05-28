// @ts-nocheck
/* eslint-disable */
import request from "@workspace/ui/lib/request";

export async function getTutorialList(options?: { [key: string]: any }) {
  return request<API.Response & { data?: API.GetTutorialListResponse }>(
    `${import.meta.env.VITE_API_PREFIX || ""}/v1/admin/tutorial/list`,
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

export async function getTutorialDetail(
  params: API.GetTutorialDetailParams,
  options?: { [key: string]: any }
) {
  return request<API.Response & { data?: API.GetTutorialDetailResponse }>(
    `${import.meta.env.VITE_API_PREFIX || ""}/v1/admin/tutorial/detail`,
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

export async function updateTutorial(
  body: API.UpdateTutorialRequest,
  options?: { [key: string]: any }
) {
  return request<API.Response & { data?: any }>(
    `${import.meta.env.VITE_API_PREFIX || ""}/v1/admin/tutorial/`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}
