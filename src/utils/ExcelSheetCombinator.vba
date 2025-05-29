Sub TumSayfalariBirlestir()

    Dim ws As Worksheet
    Dim toplamWs As Worksheet
    Dim hedefSatir As Long
    Dim veriAraligi As Range
    Dim kaynakSonSatir As Long
    Dim kaynakSonSutun As Long
    Dim i As Long
    
    ' Tüm Sayfalar sayfası varsa sil
    Application.DisplayAlerts = False
    On Error Resume Next
    ThisWorkbook.Worksheets("Tüm Sayfalar").Delete
    On Error GoTo 0
    Application.DisplayAlerts = True
    
    ' Yeni toplam sayfası oluştur
    Set toplamWs = ThisWorkbook.Worksheets.Add
    toplamWs.Name = "Tüm Sayfalar"
    hedefSatir = 1

    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> toplamWs.Name Then
        
            ' Sayfada veri olup olmadığını kontrol et
            If Application.WorksheetFunction.CountA(ws.Cells) > 0 Then
            
                ' Son dolu satırı ve sütunu bul
                kaynakSonSatir = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
                kaynakSonSutun = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
                
                ' Başlık satırını sadece ilk sayfadan al
                If hedefSatir = 1 Then
                    Set veriAraligi = ws.Range(ws.Cells(1, 1), ws.Cells(kaynakSonSatir, kaynakSonSutun))
                Else
                    Set veriAraligi = ws.Range(ws.Cells(2, 1), ws.Cells(kaynakSonSatir, kaynakSonSutun)) ' başlığı atla
                End If
                
                ' Verileri kopyala
                veriAraligi.Copy
                toplamWs.Cells(hedefSatir, 1).PasteSpecial xlPasteValues
                Application.CutCopyMode = False
                
                ' Yeni hedef satır pozisyonu
                hedefSatir = toplamWs.Cells(toplamWs.Rows.Count, 1).End(xlUp).Row + 1
            End If
        End If
    Next ws

    MsgBox "Tüm sayfalar başarıyla 'Tüm Sayfalar' sayfasında birleştirildi.", vbInformation

End Sub
