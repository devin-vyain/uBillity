from django.db import models

class Bill(models.Model):
    name = models.CharField(max_length=30)
    description = models.CharField(max_length=200)
    amount=models.FloatField()

    def __str__(self):
        return self.name