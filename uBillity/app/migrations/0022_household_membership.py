from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0021_alter_bill_created_by_alter_bill_household_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HouseholdMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_default', models.BooleanField(default=False)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='app.household')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='household_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('user', 'household')}},
        ),
    ]