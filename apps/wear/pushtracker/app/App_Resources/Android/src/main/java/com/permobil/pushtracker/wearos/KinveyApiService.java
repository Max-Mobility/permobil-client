package com.permobil.pushtracker.wearos;

import java.util.List;
import java.util.Map;

import io.reactivex.Observable;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Header;
import retrofit2.http.Headers;
import retrofit2.http.PUT;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface KinveyApiService {
    @Headers({
            "Content-Type:application/json"
    })
    @PUT(Constants.API_DATA_ENDPOINT + "/{id}")
    Observable<DailyActivity> sendData(
                                       @Header("Authorization") String authorization,
                                       String id,
                                       @Body DailyActivity data
                                       );

    @PUT(Constants.API_DATA_ENDPOINT + "/{id}")
    Observable<DailyActivity> sendData(
                                       @Header("Authorization") String authorization,
                                       @Body RequestBody data,
                                       @Path("id") String id
                                       );

  @GET(Constants.API_SD_ENDPOINT)
  Call<List<Map>> getUsage(
                                 @Header("Authorization") String authorization,
                                 @Query("query") String query
                                 );
  @GET(Constants.API_SD_ENDPOINT)
  Call<List<Map>> getUsage(
                                 @Header("Authorization") String authorization,
                                 @Query("query") String query,
                                 @Query("limit") int limit
                                 );
  @GET(Constants.API_SD_ENDPOINT)
  Call<List<Map>> getUsage(
                                 @Header("Authorization") String authorization,
                                 @Query("query") String query,
                                 @Query("sort") String sort
                                 );
  @GET(Constants.API_SD_ENDPOINT)
  Call<List<Map>> getUsage(
                                 @Header("Authorization") String authorization,
                                 @Query("query") String query,
                                 @Query("limit") int limit,
                                 @Query("sort") String sort,
                                 @Query("skip") int skip
                                 );
}
