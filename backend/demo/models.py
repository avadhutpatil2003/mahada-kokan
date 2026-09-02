from django.db import models

class MhadaPlot(models.Model):
    gid = models.AutoField(primary_key=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    district = models.CharField(max_length=50, null=True, blank=True)
    taluka = models.CharField(max_length=50, null=True, blank=True)
    muncipal_c = models.CharField(max_length=50, null=True, blank=True)
    ward = models.CharField(max_length=50, null=True, blank=True)
    layoutno = models.CharField(max_length=50, null=True, blank=True)
    plotnumber = models.CharField(max_length=50, null=True, blank=True)
    occupant = models.CharField(max_length=50, null=True, blank=True)
    type_of_co = models.CharField(max_length=50, null=True, blank=True)
    room_no = models.CharField(max_length=50, null=True, blank=True)
    totalarea = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    grflrarea = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    f1stflrare = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    f2ndflrare = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    shape_area = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    shape_leng = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    class_field = models.CharField(db_column='class', max_length=50, null=True, blank=True)
    firstallot = models.CharField(max_length=50, null=True, blank=True)
    structuref = models.CharField(max_length=50, null=True, blank=True)
    mhadatranf = models.CharField(max_length=50, null=True, blank=True)
    date = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'mhada_plot'
        managed = False

    def __str__(self):
        return f"{self.layoutno} - Plot {self.plotnumber} ({self.district})"
