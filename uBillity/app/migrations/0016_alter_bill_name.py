# Generated by Django 5.2.4 on 2025-07-21 03:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0015_alter_bill_recurrence'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bill',
            name='name',
            field=models.CharField(max_length=50),
        ),
    ]
