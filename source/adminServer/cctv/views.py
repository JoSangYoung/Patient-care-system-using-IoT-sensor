# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.views.generic import ListView, DetailView
from cctv.models import CCTV

# Create your views here.

class RoomLV(ListView):
    model = CCTV

class RoomDV(DetailView):
    model = CCTV
