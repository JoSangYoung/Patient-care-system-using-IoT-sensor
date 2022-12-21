from django.conf.urls import url
from cctv.views import *

urlpatterns = [
    url(r'^$', RoomLV.as_view(), name='index'),
    url(r'^cctv/$', RoomLV.as_view(), name='cctv_list'),
    url(r'^cctv/(?P<pk>\d+)/$', RoomDV.as_view(), name='cctv_detail'),
]

