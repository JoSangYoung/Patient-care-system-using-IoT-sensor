# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.core.urlresolvers import reverse

# Create your models here.


class CCTV(models.Model): 
    RoomName = models.CharField(max_length=20)
    Ip = models.CharField(max_length=20)
    InfoPort = models.CharField(max_length=5)
    CamPort = models.CharField(max_length=5)

    def __unicode__(self):
        return self.RoomName

    def get_absolute_url(self):
        return reverse('cctv:cctv_detail', args=(self.id,))
