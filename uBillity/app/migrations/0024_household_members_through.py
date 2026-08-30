from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0023_populate_household_membership'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='household',
                    name='members',
                    field=models.ManyToManyField(
                        related_name='households',
                        through='app.HouseholdMembership',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            database_operations=[
                migrations.RemoveField(
                    model_name='household',
                    name='members',
                ),
            ],
        ),
    ]